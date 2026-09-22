<?php

namespace App\Services;

use App\Models\AuthenticationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthenticationCodeService
{
    public const TYPE_FORGOT_PASSWORD = 'forgot_password';

    public const TYPE_TWO_FACTOR = 'two_factor';

    public function issue(
        User $user,
        string $type
    ): string {
        AuthenticationCode::query()
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->whereNull('used_at')
            ->update([
                'used_at' => now(),
            ]);

        $code = (string) random_int(
            100000,
            999999
        );

        $expirationMinutes =
            $type === self::TYPE_TWO_FACTOR
                ? 2
                : 5;

        AuthenticationCode::create([
            'user_id' => $user->id,
            'type' => $type,
            'code_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(
                $expirationMinutes
            ),
        ]);

        return $code;
    }

    public function verify(
        User $user,
        string $type,
        string $code
    ): bool {
        $authenticationCode =
            AuthenticationCode::query()
                ->where('user_id', $user->id)
                ->where('type', $type)
                ->whereNull('used_at')
                ->where(
                    'expires_at',
                    '>',
                    now()
                )
                ->latest('id')
                ->first();

        if (!$authenticationCode) {
            return false;
        }

        if (!Hash::check(
            $code,
            $authenticationCode->code_hash
        )) {
            return false;
        }

        $authenticationCode->update([
            'used_at' => now(),
        ]);

        return true;
    }

    public function activeExpiry(
        User $user,
        string $type
    ): ?\Illuminate\Support\Carbon {
        $authenticationCode =
            AuthenticationCode::query()
                ->where('user_id', $user->id)
                ->where('type', $type)
                ->whereNull('used_at')
                ->where(
                    'expires_at',
                    '>',
                    now()
                )
                ->latest('id')
                ->first();

        return $authenticationCode?->expires_at;
    }
}