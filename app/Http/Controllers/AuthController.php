<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller{
    public function getUser() {
        $user = Auth::user();

        if (!$user) {
            return response('null')->header('Content-Type', 'application/json');
        }

        return response()->json($user);
    }

    public function doLogin(Request $request) {
        $rules = [
            'email'    => 'required|string|max:255|email',
            'password' => 'required|string|min:6',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 400);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        $user = User::where('email', $email)->first();

        if (!$user) {
            return response()->json(['error' => 'Пользователь с указанным email адресом не найден'], 400);
        }

        if (!Hash::check($password, $user->password)) {
            return response()->json(['error' => 'Пароль не совпадает с указанным при регистрации'], 400);
        }

        Auth::login($user);

        return response()->json($user);
    }

    public function doRegister(Request $request) {
        $rules = [
            'email'    => 'required|string|max:255|email',
            'password' => 'required|string|min:6',
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors(),
            ], 400);
        }

        $email = $request->input('email');
        $password = $request->input('password');

        $user = User::where('email', $email)->first();

        if ($user) {
            return response()->json(['error' => 'Пользователь с таким email адресом уже зарегистрирован'], 400);
        } else {
            $user = new User();
            $user->email = $email;
            $user->password = Hash::make($password);
            $user->save();
        }

        Auth::login($user);

        return response()->json($user);
    }

    public function doLogout(Request $request) {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response('null')->header('Content-Type', 'application/json');
    }
}
