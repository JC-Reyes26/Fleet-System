<?php

namespace App\Http\Controllers;

use App\Models\HospitalFacility;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HospitalFacilityController extends Controller
{
    /**
     * Search active hospital facilities.
     *
     * GET /hospital-facilities/search?q=tala
     */
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->input('q', ''));

        $hospitals = HospitalFacility::query()
            ->where('status', true)
            ->when($query !== '', function ($builder) use ($query) {
                $builder->where(function ($search) use ($query) {
                    $search->where('name', 'like', "%{$query}%")
                        ->orWhere('address', 'like', "%{$query}%")
                        ->orWhere('city', 'like', "%{$query}%")
                        ->orWhere('province', 'like', "%{$query}%");
                });
            })
            ->orderBy('name')
            ->limit(15)
            ->get([
                'id',
                'name',
                'address',
                'city',
                'province',
                'latitude',
                'longitude',
                'type',
            ]);

        return response()->json([
            'success' => true,
            'data' => $hospitals,
        ]);
    }
}