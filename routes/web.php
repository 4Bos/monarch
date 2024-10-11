<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class)->group(function () {
    Route::post('/api/login', [\App\Http\Controllers\MainController::class, 'doLogin']);
    Route::post('/api/logout', [\App\Http\Controllers\MainController::class, 'doLogout']);
    Route::get('/api/user', [\App\Http\Controllers\MainController::class, 'getUser']);

    Route::get('/api/points', [\App\Http\Controllers\MainController::class, 'getPoints']);
    Route::put('/api/points', [\App\Http\Controllers\MainController::class, 'putPoint']);
    Route::put('/api/points/{id}', [\App\Http\Controllers\MainController::class, 'putPoint']);
    Route::delete('/api/points/{id}', [\App\Http\Controllers\MainController::class, 'deletePoint']);
});
