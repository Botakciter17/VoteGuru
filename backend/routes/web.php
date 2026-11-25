<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;

Route::get('/{any?}', function () {
    $spaIndex = public_path('spa.html');
    if (File::exists($spaIndex)) {
        return response(File::get($spaIndex), 200)->header('Content-Type', 'text/html');
    }
    return view('welcome');
})->where('any', '^(?!api|storage|up).*$');
