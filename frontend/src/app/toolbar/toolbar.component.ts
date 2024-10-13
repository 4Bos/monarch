import { Component, DestroyRef } from '@angular/core';
import { ApiService } from "../api.service";
import { finalize, Observable } from "rxjs";
import { User } from "../types/user";
import { AsyncPipe } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatDialog, MatDialogRef, MatDialogState } from "@angular/material/dialog";
import { LoginModalComponent } from "../login-modal/login-modal.component";
import { PointAddingModeService } from "../point-adding-mode.service";
import { RegistrationModalComponent } from "../registration-modal/registration-modal.component";

@Component({
    selector: 'app-toolbar',
    standalone: true,
    imports: [
        AsyncPipe,
    ],
    templateUrl: './toolbar.component.html',
    styleUrl: './toolbar.component.scss',
})
export class ToolbarComponent {
    currentUser$: Observable<User | null>;

    modalRef: MatDialogRef<any> | null = null;

    logoutInProgress = false;

    constructor(
        private _api: ApiService,
        private _destroyRef: DestroyRef,
        private _dialog: MatDialog,
        protected pointAddingMode: PointAddingModeService,
    ) {
        this.currentUser$ = this._api.currentUser$;
    }

    startPointAddingMode(): void {
        if (!this._api.currentUser) {
            this.openLoginModal('Чтобы добавить метку на карту необходимо авторизоваться');

            return;
        }

        this.pointAddingMode.activate();
    }

    cancelPointAddingMode(): void {
        this.pointAddingMode.deactivate();
    }

    logout(): void {
        if (this.logoutInProgress) {
            return;
        }

        this.logoutInProgress = true;

        this._api.logout().pipe(
            finalize(() => this.logoutInProgress = false),
            takeUntilDestroyed(this._destroyRef),
        ).subscribe();
    }

    openSignUpModal(): void {
        if (this.modalRef && this.modalRef.getState() !== MatDialogState.CLOSED) {
            return;
        }

        this.modalRef = this._dialog.open(RegistrationModalComponent, {
            width: '400px',
            autoFocus: false,
        });
    }

    openLoginModal(warning = ''): void {
        if (this.modalRef && this.modalRef.getState() !== MatDialogState.CLOSED) {
            return;
        }

        this.modalRef = this._dialog.open(LoginModalComponent, {
            width: '400px',
            autoFocus: false,
            data: {
                warning: warning,
            }
        });
    }
}
