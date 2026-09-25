<?php

namespace App\Services;

use App\Models\AuthenticationCode;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AuthenticationCodeService
{
    public const TYPE_FORGOT_PASSWORD = 'forgot_password';

    public const TYPE_TWO_FACTOR = 'two_factor';

    public const RESEND_MAX_ATTEMPTS = 2;

    public const RESEND_COOLDOWN_SECONDS = 30;

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

    public function resendStatus(
        string $type
    ): array {
        $prefix = "auth_resend.{$type}";

        $attempts = (int) session(
            "{$prefix}.attempts",
            0
        );

        $cooldownUntil = (int) session(
            "{$prefix}.cooldown_until",
            0
        );

        $now = now()->timestamp;

        /*
         * Cooldown has expired.
         * Reset the resend cycle.
         */
        if (
            $cooldownUntil > 0 &&
            $cooldownUntil <= $now
        ) {
            session()->forget([
                "{$prefix}.attempts",
                "{$prefix}.cooldown_until",
            ]);

            $attempts = 0;
            $cooldownUntil = 0;
        }

        /*
         * Still within cooldown.
         */
        if ($cooldownUntil > $now) {
            return [
                'attempts' => $attempts,
                'remaining' => 0,
                'cooldown' =>
                    $cooldownUntil - $now,
            ];
        }

        return [
            'attempts' => $attempts,
            'remaining' => max(
                0,
                self::RESEND_MAX_ATTEMPTS - $attempts
            ),
            'cooldown' => 0,
        ];
    }

    public function consumeResendAttempt(
        string $type
    ): array {
        $prefix = "auth_resend.{$type}";

        $status =
            $this->resendStatus($type);

        /*
         * Still within cooldown.
         */
        if ($status['cooldown'] > 0) {
            return [
                'allowed' => false,
                'attempts' =>
                    $status['attempts'],
                'remaining' => 0,
                'cooldown' =>
                    $status['cooldown'],
            ];
        }

        $attempts =
            $status['attempts'] + 1;

        /*
         * Second resend:
         * start 30-second cooldown.
         */
        if (
            $attempts >=
            self::RESEND_MAX_ATTEMPTS
        ) {
            $cooldownUntil =
                now()
                    ->addSeconds(
                        self::RESEND_COOLDOWN_SECONDS
                    )
                    ->timestamp;

            session([
                "{$prefix}.attempts" =>
                    self::RESEND_MAX_ATTEMPTS,

                "{$prefix}.cooldown_until" =>
                    $cooldownUntil,
            ]);

            return [
                'allowed' => true,
                'attempts' => $attempts,
                'remaining' => 0,
                'cooldown' =>
                    self::RESEND_COOLDOWN_SECONDS,
            ];
        }

        /*
         * First resend.
         */
        session([
            "{$prefix}.attempts" =>
                $attempts,

            "{$prefix}.cooldown_until" => 0,
        ]);

        return [
            'allowed' => true,
            'attempts' => $attempts,
            'remaining' =>
                self::RESEND_MAX_ATTEMPTS -
                $attempts,
            'cooldown' => 0,
        ];
    }
}