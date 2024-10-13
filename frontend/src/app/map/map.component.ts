import { AfterViewInit, Component, DestroyRef, ElementRef, NgZone } from '@angular/core';
import { YMap, YMapMarker } from "@yandex/ymaps3-types";
import { combineLatest, Subject } from "rxjs";
import { ApiService } from "../api.service";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Point } from "../types/point";
import { MatSnackBar } from "@angular/material/snack-bar";
import { DomEvent, DomEventHandlerObject } from "@yandex/ymaps3-types/imperative/YMapListener";
import { PointAddingModeService } from "../point-adding-mode.service";
import { EditPointModalData } from "../types/edit-point-modal-data";
import { MatDialog, MatDialogRef } from "@angular/material/dialog";
import { EditPointModalComponent } from "../edit-point-modal/edit-point-modal.component";
import type { LngLat } from "@yandex/ymaps3-types/common/types";
import type { YMapFeature, YMapHotspot } from "@yandex/ymaps3-types/imperative";
import { User } from "../types/user";
import { YMapHint } from "@yandex/ymaps3-types/packages/hint";

@Component({
    selector: 'app-map',
    standalone: true,
    imports: [],
    templateUrl: './map.component.html',
    styleUrl: './map.component.scss',
})
export class MapComponent implements AfterViewInit {
    mapReady$: Subject<void> = new Subject();

    map!: YMap;

    markers: YMapMarker[] = [];

    constructor(
        private _api: ApiService,
        private _zone: NgZone,
        private _elementRef: ElementRef,
        private _destroyRef: DestroyRef,
        private _snackBar: MatSnackBar,
        private _dialog: MatDialog,
        private _pointAddingMode: PointAddingModeService,
    ) {
        // Load all point when map is ready.
        combineLatest([
            this._api.getPoints(),
            this.mapReady$,
        ]).pipe(
            takeUntilDestroyed(),
        ).subscribe(([points]) => {
            this.markers = points.map((point) => this.createMarker(point));
        });

        // Update markers when logged-in user is changed.
        this._api.currentUser$.pipe(
            takeUntilDestroyed(this._destroyRef),
        ).subscribe((user) => {
            this.markers.forEach(marker => {
                const point = this.getPointFromObject(marker);

                if (!point) {
                    return;
                }

                marker.element.classList.toggle('marker--alien', user?.id !== point.owner_id);
                marker.update({
                    draggable: user?.id === point.owner_id,
                });
            });
        });
    }

    ngAfterViewInit(): void {
        this._zone.runOutsideAngular(() => {
            this.initMap().then();
        });
    }

    async initMap(): Promise<void> {
        await ymaps3.ready;

        this.map = new ymaps3.YMap(this._elementRef.nativeElement, {
            location: {
                center: [37.588144, 55.733842],
                zoom: 10,
            },
        });

        const defaultFeatures = new ymaps3.YMapDefaultFeaturesLayer({});

        this.map.addChild(new ymaps3.YMapDefaultSchemeLayer({}));
        this.map.addChild(defaultFeatures);
        this.map.addChild(new ymaps3.YMapListener({
            onFastClick: this.onMapFastClick.bind(this),
        }));
        this.map.addChild(await this.makeCustomHint());

        this._zone.run(() => this.mapReady$.next());
    }

    onMapFastClick(object: DomEventHandlerObject, event: DomEvent): void {
        if (this._pointAddingMode.isActive && this._api.currentUser) {
            this._zone.run(() => this.addPoint(event.coordinates));
        } else if (object && object.type === 'marker') {
            this._zone.run(() => this.editPoint(object.entity));
        }
    }

    createMarker(point: Point): any {
        const { YMapMarker } = ymaps3;

        const marker = new YMapMarker({
            coordinates: [point.longitude, point.latitude],
            draggable: this._api.currentUser?.id === point.owner_id,
            mapFollowsOnDrag: true,
            properties: {point},
            onDragEnd: (coordinates: any) => {
                this._api.putPoint(point.id, {
                    longitude: coordinates[0],
                    latitude: coordinates[1],
                    description: point.description,
                }).pipe(
                    takeUntilDestroyed(this._destroyRef),
                ).subscribe((updatedPoint) => {
                    point.longitude = updatedPoint.longitude;
                    point.latitude = updatedPoint.latitude;

                    this._snackBar.open('Позиция метки успешно изменена', 'Закрыть', {
                        duration: 5000,
                    });
                });
            },
        }, this.createMarkerElement(this._api.currentUser?.id !== point.owner_id));

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

    addPoint(coordinates: LngLat): void {
        const { YMapMarker } = ymaps3;

        const tmpMarker = new YMapMarker({
            coordinates: coordinates,
        }, this.createMarkerElement());

        this.map.addChild(tmpMarker);

        const data: EditPointModalData = {
            id: null,
            longitude: coordinates[0],
            latitude: coordinates[1],
            description: '',
        }

        const modalRef: MatDialogRef<EditPointModalComponent, Point> = this._dialog.open(EditPointModalComponent, {
            width: '400px',
            autoFocus: false,
            data: data,
        });

        modalRef.afterClosed().pipe(
            takeUntilDestroyed(this._destroyRef),
        ).subscribe((point) => {
            this.map.removeChild(tmpMarker);

            this._pointAddingMode.deactivate();

            if (point) {
                this.markers.push(this.createMarker(point));

                this._snackBar.open('Новая метка успешно добавлена', 'Закрыть', {
                    duration: 5000,
                });
            }
        });
    }

    editPoint(marker: YMapMarker): void {
        const point = this.getPointFromObject(marker);

        if (!point) {
            return;
        }

        if (this._api.currentUser?.id !== point.owner_id) {
            return;
        }

        const data: EditPointModalData = {
            id: point.id,
            longitude: point.longitude,
            latitude: point.latitude,
            description: point.description,
        }

        const modalRef: MatDialogRef<EditPointModalComponent, Point>
            = this._dialog.open(EditPointModalComponent, {
            width: '400px',
            autoFocus: false,
            data: data,
        });

        modalRef.afterClosed().pipe(
            takeUntilDestroyed(this._destroyRef),
        ).subscribe((newPoint) => {
            if (newPoint) {
                point.description = newPoint.description;

                this._snackBar.open('Метка успешно сохранена', 'Закрыть', {
                    duration: 5000,
                });
            }
        });

        modalRef.componentInstance.onDeletePoint$.pipe(
            takeUntilDestroyed(this._destroyRef),
        ).subscribe(() => {
            this.map.removeChild(marker);

            this._snackBar.open('Метка успешно удалена', 'Закрыть', {
                duration: 5000,
            });
        });
    }

    getPointFromObject(object: YMapFeature | YMapMarker | YMapHotspot | undefined): Point| null {
        const point = object?.properties?.['point'] as Point | undefined;

        return point ? point : null;
    }

    async makeCustomHint(): Promise<YMapHint> {
        const { YMapHint, YMapHintContext } = await ymaps3.import('@yandex/ymaps3-hint@0.0.1');

        const hint = new YMapHint({
            hint: (object) => {
                const point = this.getPointFromObject(object);

                if (!point || !point.description) {
                    return;
                }

                return point;
            },
        });

        hint.addChild(new (class CustomHint extends ymaps3.YMapEntity<{}> {
            constructor(
                private _currentUser: () => User | null,
            ) {
                super({});
            }

            override _onAttach() {
                const root = document.createElement('div');
                const message = document.createElement('div');
                const help = document.createElement('div');

                root.className = 'hint';
                message.className = 'hint__message';
                help.className = 'hint__help';

                help.textContent = 'Нажмите на метку чтобы изменить ее';

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

                        root.classList.toggle('hint--alien', this._currentUser()?.id !== properties?.owner_id)
                        message.textContent = properties?.description;
                    },
                    {immediate: true},
                );
            }

            override _onDetach() {
                // @ts-ignore
                this._detachDom();
            }
        })(() => this._api.currentUser));

        return hint;
    }
}
