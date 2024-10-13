import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class PointAddingModeService {
    private _isActive: boolean = false;

    get isActive(): boolean {
        return this._isActive;
    }

    constructor() { }

    activate(): void {
        this._isActive = true;
    }

    deactivate(): void {
        this._isActive = false;
    }
}
