import { Component, DestroyRef, Inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { ApiService } from "../api.service";
import { MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { DialogRef } from "@angular/cdk/dialog";
import { LoginModalData } from "../types/login-modal-data";
import { catchError, EMPTY, finalize } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { NgIf } from "@angular/common";
import { LoginModalComponent } from "../login-modal/login-modal.component";
import { validateSamePassword } from "../validators";
import { IsInvalidPipe } from "../pipes/is-invalid.pipe";

@Component({
    selector: 'app-registration-modal',
    standalone: true,
    imports: [
        NgIf,
        ReactiveFormsModule,
        IsInvalidPipe,
    ],
    templateUrl: './registration-modal.component.html',
    styleUrl: './registration-modal.component.scss',
})
export class RegistrationModalComponent {
    form: FormGroup = new FormGroup({
        email: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.email,
                Validators.maxLength(255),
                Validators.required,
            ],
        }),
        password: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
            ],
        }),
        confirm_password: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
                validateSamePassword,
            ],
        }),
    });

    registrationInProgress = false;

    constructor(
        private _api: ApiService,
        private _destroyRef: DestroyRef,
        private _dialog: MatDialog,
        private _dialogRef: DialogRef,
        @Inject(MAT_DIALOG_DATA) public data: LoginModalData,
    ) { }

    register(): void {
        this.form.markAllAsTouched();

        if (this.registrationInProgress || this.form.invalid) {
            return;
        }

        this.registrationInProgress = true;

        this._api.register(
            this.form.controls['email'].value,
            this.form.controls['password'].value,
        ).pipe(
            catchError((error) => {
                if (error instanceof HttpErrorResponse && error.status === 400 && error.error && error.error.error) {
                    alert(error.error.error);

                    return EMPTY;
                }

                throw error;
            }),
            finalize(() => this.registrationInProgress = false),
            takeUntilDestroyed(this._destroyRef),
        ).subscribe(() => {
            this._dialogRef.close();
        });
    }

    showLoginForm(): void {
        this._dialogRef.close();
        this._dialog.open(LoginModalComponent, {
            width: '400px',
            autoFocus: false,
            enterAnimationDuration: 0,
        });
    }

    close(): void {
        this._dialogRef.close();
    }
}
