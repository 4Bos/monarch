<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * @property int         $id
 * @property int         $owner_id
 * @property float       $longitude
 * @property float       $latitude
 * @property string      $description
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class Point extends Model
{
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'owner_id' => 'integer',
            'longitude' => 'float',
            'latitude' => 'float',
        ];
    }
}
