<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\PointsController;
use Illuminate\Support\Facades\Route;

Route::post('login', [AuthController::class, 'doLogin']);
Route::post('register', [AuthController::class, 'doRegister']);
Route::post('logout', [AuthController::class, 'doLogout']);
Route::get('user', [AuthController::class, 'getUser']);

Route::get('points', [PointsController::class, 'getPoints']);
Route::put('points', [PointsController::class, 'putPoint']);
Route::put('points/{id}', [PointsController::class, 'putPoint']);
Route::delete('points/{id}', [PointsController::class, 'deletePoint']);
