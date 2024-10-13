<?php

namespace App\Http\Controllers;

use App\Models\Point;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class PointsController extends Controller {
    public function getPoints(): JsonResponse {
        $points = Point::all();

        return response()->json($points);
    }

    public function putPoint(Request $request, ?int $id = null): JsonResponse {
        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Требуется авторизация'], 401);
        }

        $rules = [
            'longitude' => 'required|numeric',
            'latitude' => 'required|numeric',
            'description' => 'nullable|string|max:1024',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 400);
        }

        $longitude =  $request->input('longitude');
        $latitude =  $request->input('latitude');
        $description =  $request->input('description');

        if ($id === null) {
            $point = new Point();
            $point->owner_id = $user->id;
        } else {
            $point = Point::where('id', $id)->first();

            if (!$point) {
                return response()->json(['error' => 'Точка не найдена'], 404);
            }

            if ($user->id !== $point->owner_id) {
                return response()->json(['error' => 'Вы можете редактировать только свои точки'], 403);
            }
        }

        $point->longitude = $longitude;
        $point->latitude = $latitude;
        $point->description = $description ?? '';
        $point->save();

        return response()->json($point);
    }

    public function deletePoint(int $id) {
        $point = Point::where('id', $id)->first();

        if (!$point) {
            return response()->json(['error' => 'Точка не найдена'], 404);
        }

        /** @var User|null $user */
        $user = Auth::user();

        if (!$user) {
            return response()->json(['error' => 'Требуется авторизация'], 401);
        }

        if ($user->id !== $point->owner_id) {
            return response()->json(['error' => 'Вы не можете удалять чужие точки'], 403);
        }

        $point->delete();

        return response('', 204);
    }
}
