import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { Point } from "./types/point";
import { PointData } from "./types/point-data";
import { User } from "./types/user";

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    baseUrl = '';

    currentUser$: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

    constructor(
        private http: HttpClient,
    ) { }

    login(email: string, password: string): Observable<User> {
        return this.http.post<User>(`${this.baseUrl}/api/login`, {
            email: email,
            password: password,
        }, {withCredentials: true}).pipe(
            tap((user) => this.currentUser$.next(user)),
        );
    }

    logout(): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/api/logout`, {}, {withCredentials: true}).pipe(
            tap(() => this.currentUser$.next(null)),
        );
    }

    user(): Observable<User | null> {
        return this.http.get<User | null>(`${this.baseUrl}/api/user`, {withCredentials: true}).pipe(
            tap(user => this.currentUser$.next(user)),
        );
    }

    getPoints(): Observable<Point[]> {
        return this.http.get<Point[]>(`${this.baseUrl}/api/points`, {withCredentials: true});
    }

    putPoint(id: number | null, data: PointData): Observable<Point> {
        const url = id === null
            ? `${this.baseUrl}/api/points`
            : `${this.baseUrl}/api/points/${id}`;

        return this.http.put<Point>(url, data, {withCredentials: true});
    }

    deletePoint(id: number): Observable<Point> {
        return this.http.delete<Point>(`${this.baseUrl}/api/points/${id}`, {withCredentials: true});
    }
}
