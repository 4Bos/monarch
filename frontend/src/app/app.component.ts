import { AfterViewInit, Component, DestroyRef, NgZone } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiService } from "./api.service";
import { catchError, combineLatest, EMPTY, finalize, Subject, switchMap } from "rxjs";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { User } from "./types/user";
import { NgIf } from "@angular/common";
import { Point } from "./types/point";
import { HttpErrorResponse } from "@angular/common/http";

declare var ymaps3: any;

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, ReactiveFormsModule, NgIf],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
    mapReady$: Subject<void> = new Subject();

    authInProgress = false;

    logoutInProgress = false;

    editPointInProgress = false;

    deletePointInProgress = false;

    addingPointMode = false;

    editPointMode = false;

    currentUser: User | null = null;

    currentPoint: Point | null = null;

    currentMarker: any = null;

    authForm = new FormGroup({
        email: new FormControl('user@example.com', {
            nonNullable: true,
            validators: [
                Validators.email,
                Validators.maxLength(255),
                Validators.required,
            ],
        }),
        password: new FormControl('123456', {
            nonNullable: true,
            validators: [
                Validators.required,
            ],
        }),
    });

    pointDescriptionControl = new FormControl('', {
        validators: [
            Validators.maxLength(1024),
        ],
        nonNullable: true,
    });

    map: any;

    markers: any[] = [];

    constructor(
        private _zone: NgZone,
        private _api: ApiService,
        protected destroyRef: DestroyRef,
    ) {
        this._api.user().pipe(
            switchMap(() => this._api.currentUser$),
            takeUntilDestroyed(),
        ).subscribe((user) => {
            this.currentUser = user;
        });

        combineLatest([
            this._api.getPoints(),
            this.mapReady$,
        ]).pipe(
            takeUntilDestroyed(),
        ).subscribe(([points]) => {
            this.markers = points.map((point) => {
                return this.createMarker(point);
            });
        });

        this._api.currentUser$.pipe(
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((user) => {
            this.markers.forEach(marker => {
                marker.element.classList.toggle('marker--alien', user?.id !== marker.properties.owner_id);
                marker.update({
                    draggable: user?.id === marker.properties.owner_id,
                });
            });
        });
    }

    auth(): void {
        this.authForm.markAllAsTouched();

        if (!this.authForm.valid || this.authInProgress) {
            return;
        }

        this.authInProgress = true;

        this._api.login(
            this.authForm.controls.email.value,
            this.authForm.controls.password.value,
        ).pipe(
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 403 && error.error && error.error.error) {
                    alert(error.error.error);

                    return EMPTY;
                }

                throw error;
            }),
            finalize(() => this.authInProgress = false),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe();
    }

    logout(): void {
        if (this.logoutInProgress) {
            return;
        }

        this.logoutInProgress = true;

        this._api.logout().pipe(
            finalize(() => this.logoutInProgress = false),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe();
    }

    ngAfterViewInit(): void {
        this._zone.runOutsideAngular(() => {
            this.initMap().then();
        });
    }

    startAddingPoint(): void {
        this.addingPointMode = true;
        this.pointDescriptionControl.disable();
    }

    cancel(): void {
        this.addingPointMode = false;
        this.pointDescriptionControl.enable();
    }

    async initMap(): Promise<void> {
        await ymaps3.ready;

        const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapListener } = ymaps3;

        this.map = new YMap(document.getElementById('map'), {
            location: {
                center: [37.588144, 55.733842],
                zoom: 10,
            },
        });

        const defaultFeatures = new YMapDefaultFeaturesLayer();

        this.map.addChild(new YMapDefaultSchemeLayer());
        this.map.addChild(defaultFeatures);
        this.map.addChild(new YMapListener({
            onFastClick: this.onMapFastClick.bind(this),
        }));

        const {YMapHint, YMapHintContext} = await ymaps3.import('@yandex/ymaps3-hint@0.0.1');

        const hint = new YMapHint({
            layers: [defaultFeatures.layer],
            hint: (object: any) => {
                if (!object?.properties?.id || !object?.properties?.description) {
                    return;
                }

                return object?.properties;
            },
        });

        this.map.addChild(hint);

        const self = this;

        hint.addChild(
            new (class MyHint extends ymaps3.YMapEntity {
                _onAttach() {
                    const root = document.createElement('div');
                    const message = document.createElement('div');
                    const help = document.createElement('div');

                    root.className = 'hint';
                    message.className = 'hint__message';
                    help.className = 'hint__help';

                    help.textContent = 'Нажмите на метку чтобы изменить';

                    root.appendChild(message);
                    root.appendChild(help);

                    // @ts-ignore
                    this._element = root;

                    // @ts-ignore
                    this._detachDom = ymaps3.useDomContext(this, root);
                    // @ts-ignore
                    this._watchContext(
                        YMapHintContext,
                        () => {
                            // @ts-ignore
                            const properties = this._consumeContext(YMapHintContext)?.hint;

                            root.classList.toggle('hint--alien', self.currentUser?.id !== properties?.owner_id)
                            message.textContent = properties?.description;
                        },
                        {immediate: true}
                    );
                }

                _onDetach() {
                    // @ts-ignore
                    this._detachDom();
                }
            })()
        );

        this._zone.run(() => this.mapReady$.next());
    }

    createMarker(point: Point): any {
        const { YMapMarker } = ymaps3;

        const marker = new YMapMarker({
            coordinates: [point.longitude, point.latitude],
            draggable: this.currentUser?.id === point.owner_id,
            mapFollowsOnDrag: true,
            properties: point,
            onDragEnd: (coordinates: any) => {
                this._api.putPoint(point.id, {
                    longitude: coordinates[0],
                    latitude: coordinates[1],
                    description: point.description,
                }).pipe(
                    takeUntilDestroyed(this.destroyRef),
                ).subscribe((updatedPoint) => {
                    point.longitude = updatedPoint.longitude;
                    point.latitude = updatedPoint.latitude;
                });
            },
        }, this.createMarkerElement(this.currentUser?.id !== point.owner_id));

        this.map.addChild(marker);

        return marker;
    }

    createMarkerElement(isAlien = false): HTMLElement {
        const markerEl = document.createElement('div');

        markerEl.classList.add('marker');
        markerEl.classList.toggle('marker--alien', isAlien);
        markerEl.innerHTML = `<svg
            xmlns="http://www.w3.org/2000/svg"
            width="1.75em" height="2.25em"
            viewBox="0 0 28 36"
            fill="currentColor"
        >
            <path d="M28 14C28 23 19 36 14 36C9 36 0 23 0 14C0 6.26801 6.26801 0 14 0C21.732 0 28 6.26801 28 14Z" />
        </svg><div class="description"></div>`;

        return markerEl;
    }

    addPoint(coordinates: [number, number]): void {
        const { YMapMarker } = ymaps3;

        const tmpMarker = new YMapMarker({
            coordinates: coordinates,
        }, this.createMarkerElement());

        this.map.addChild(tmpMarker);

        this._api.putPoint(null, {
            longitude: coordinates[0],
            latitude: coordinates[1],
            description: this.pointDescriptionControl.value,
        }).pipe(
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((point) => {
            this.map.removeChild(tmpMarker);

            const marker = this.createMarker(point);

            this.markers.push(marker);

            this.selectPoint(marker);
        });

        this.addingPointMode = false;
        this.pointDescriptionControl.enable();
        this.pointDescriptionControl.setValue('');
    }

    selectPoint(object: any): void {
        if (this.currentUser?.id !== object.properties.owner_id) {
            return;
        }

        this.currentMarker = object;
        this.currentPoint = object.properties;

        this.pointDescriptionControl.setValue(object.properties.description);
        this.editPointMode = true;
    }

    deselectCurrentPoint(): void {
        this.pointDescriptionControl.setValue('');
        this.currentMarker = null;
        this.currentPoint = null;
        this.editPointMode = false;
    }

    editCurrentPoint(): void {
        const currentPoint = this.currentPoint;

        if (!currentPoint || this.editPointInProgress) {
            return;
        }

        this.editPointInProgress = true;

        this._api.putPoint(currentPoint.id, {
            latitude: currentPoint.latitude,
            longitude: currentPoint.longitude,
            description: this.pointDescriptionControl.value,
        }).pipe(
            finalize(() => this.editPointInProgress = false),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe((point) => {
            currentPoint.description = point.description;
        });
    }

    deleteCurrentPoint(): void {
        if (this.currentMarker) {
            this.deletePoint(this.currentMarker);
        }
    }

    deletePoint(object: any): void {
        if (this.deletePointInProgress) {
            return;
        }

        if (this.currentUser?.id !== object.properties.owner_id) {
            alert('Вы не можете удалять чужие точки');

            return;
        }

        this.deletePointInProgress = true;

        this._api.deletePoint(object.properties['id']).pipe(
            finalize(() => this.deletePointInProgress = false),
            takeUntilDestroyed(this.destroyRef),
        ).subscribe(() => {
            this.map.removeChild(object);

            this.deselectCurrentPoint();
        });
    }

    onMapFastClick(object: any, event: any): void {
        if (this.addingPointMode) {
            this._zone.run(() => this.addPoint(event.coordinates));
        } else if (object && object.type === 'marker') {
            this._zone.run(() => this.selectPoint(object.entity));
        } else {
            this._zone.run(() => this.deselectCurrentPoint());
        }
    }
}
