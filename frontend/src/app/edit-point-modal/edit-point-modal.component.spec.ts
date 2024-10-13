import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPointModalComponent } from './edit-point-modal.component';

describe('EditPointModalComponent', () => {
    let component: EditPointModalComponent;
    let fixture: ComponentFixture<EditPointModalComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditPointModalComponent]
        })
            .compileComponents();

        fixture = TestBed.createComponent(EditPointModalComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
