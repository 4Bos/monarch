import { Component, DestroyRef, Inject } from '@angular/core';
import { NgIf } from "@angular/common";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms";
import { catchError, EMPTY, finalize } from "rxjs";
import { HttpErrorResponse } from "@angular/common/http";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ApiService } from "../api.service";
import { DialogRef } from "@angular/cdk/dialog";
import { MAT_DIALOG_DATA, MatDialog } from "@angular/material/dialog";
import { LoginModalData } from "../types/login-modal-data";
import { RegistrationModalComponent } from "../registration-modal/registration-modal.component";
import { IsInvalidPipe } from "../pipes/is-invalid.pipe";

@Component({
    selector: 'app-login-modal',
    standalone: true,
    imports: [
        NgIf,
        ReactiveFormsModule,
        IsInvalidPipe,
    ],
    templateUrl: './login-modal.component.html',
    styleUrl: './login-modal.component.scss',
})
export class LoginModalComponent {
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
    });

    loginInProgress = false;

    constructor(
        private _api: ApiService,
        private _destroyRef: DestroyRef,
        private _dialog: MatDialog,
        private _dialogRef: DialogRef,
        @Inject(MAT_DIALOG_DATA) public data: LoginModalData | null,
    ) { }

    login(): void {
        this.form.markAllAsTouched();

        if (this.loginInProgress || this.form.invalid) {
            return;
        }

        this.loginInProgress = true;

        this._api.login(
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
            finalize(() => this.loginInProgress = false),
            takeUntilDestroyed(this._destroyRef),
        ).subscribe(() => {
            this._dialogRef.close();
        });
    }

    showRegistrationForm(): void {
        this._dialogRef.close();
        this._dialog.open(RegistrationModalComponent, {
            width: '400px',
            autoFocus: false,
            enterAnimationDuration: 0,
        });
    }

    close(): void {
        this._dialogRef.close();
    }
}
