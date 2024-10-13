import { TestBed } from '@angular/core/testing';

import { PointAddingModeService } from './point-adding-mode.service';

describe('PointAddingModeService', () => {
    let service: PointAddingModeService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PointAddingModeService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });
});
