import { Component, DestroyRef, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { NgIf } from "@angular/common";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ApiService } from "../api.service";
import { EditPointModalData } from "../types/edit-point-modal-data";
import { finalize, Subject } from "rxjs";
import { Point } from "../types/point";
import { IsInvalidPipe } from "../pipes/is-invalid.pipe";

@Component({
    selector: 'app-edit-point-modal',
    standalone: true,
    imports: [
        NgIf,
        ReactiveFormsModule,
        IsInvalidPipe,
    ],
    templateUrl: './edit-point-modal.component.html',
    styleUrl: './edit-point-modal.component.scss',
})
export class EditPointModalComponent {
    onDeletePoint$: Subject<void> = new Subject();

    saveInProgress = false;

    deleteInProgress = false;

    pointDescriptionControl = new FormControl('', {
        validators: [
            Validators.maxLength(1024),
        ],
        nonNullable: true,
    });

    constructor(
        private _dialogRef: MatDialogRef<EditPointModalComponent, Point>,
        private _api: ApiService,
        private _destroyRef: DestroyRef,
        @Inject(MAT_DIALOG_DATA) public pointData: EditPointModalData,
    ) {
        if (!this.pointData) {
            throw new Error('Dialog data required');
        }

        this.pointDescriptionControl.setValue(this.pointData.description);
    }

    save(): void {
        this.pointDescriptionControl.markAllAsTouched();

        if (this.saveInProgress || this.pointDescriptionControl.invalid) {
            return;
        }

        this.saveInProgress = true;

        this._api.putPoint(this.pointData.id, {
            longitude: this.pointData.longitude,
            latitude: this.pointData.latitude,
            description: this.pointDescriptionControl.value,
        }).pipe(
            finalize(() => this.saveInProgress = false),
            takeUntilDestroyed(this._destroyRef),
        ).subscribe((point) => {
            this._dialogRef.close(point);
        });
    }

    delete(): void {
        if (this.deleteInProgress || !this.pointData.id) {
            return;
        }

        this.deleteInProgress = true;

        this._api.deletePoint(this.pointData.id).pipe(
            finalize(() => this.deleteInProgress = false),
            takeUntilDestroyed(this._destroyRef),
        ).subscribe(() => {
            this.onDeletePoint$.next();
            this.onDeletePoint$.complete();

            this._dialogRef.close();
        });
    }

    close(): void {
        this._dialogRef.close();
    }
}
