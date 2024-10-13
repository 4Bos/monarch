import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ReactiveFormsModule } from "@angular/forms";
import { NgIf } from "@angular/common";
import { ToolbarComponent } from "./toolbar/toolbar.component";
import { MapComponent } from "./map/map.component";

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, ReactiveFormsModule, NgIf, ToolbarComponent, MapComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent { }
