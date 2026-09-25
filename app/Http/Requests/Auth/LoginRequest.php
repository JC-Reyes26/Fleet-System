<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'email',
            ],

            'password' => [
                'required',
                'string',
            ],
        ];
    }

    /**
     * Validate the request's credentials without
     * starting an authenticated session.
     *
     * @throws ValidationException
     */
    public function authenticate(): User
    {
        $this->ensureIsNotRateLimited();

        $credentials = $this->only([
            'email',
            'password',
        ]);

        $guard = Auth::guard('web');

        /*
         * Validate credentials only.
         *
         * Unlike Auth::attempt(), this does not
         * authenticate the user into the session.
         */
        if (!$guard->validate($credentials)) {
            RateLimiter::hit(
                $this->throttleKey()
            );

            throw ValidationException::withMessages([
                'email' =>
                    'The provided credentials do not match our records.',
            ]);
        }

        RateLimiter::clear(
            $this->throttleKey()
        );

        $user = $guard->getLastAttempted();

        if (!$user instanceof User) {
            throw ValidationException::withMessages([
                'email' =>
                    'Unable to authenticate the account.',
            ]);
        }

        /*
         * Preserve Laravel's normal automatic password
         * rehash behavior when the configured hashing
         * algorithm/work factor requires it.
         */
        $guard
            ->getProvider()
            ->rehashPasswordIfRequired(
                $user,
                $credentials
            );

        return $user;
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (!RateLimiter::tooManyAttempts(
            $this->throttleKey(),
            5
        )) {
            return;
        }

        event(new Lockout($this));

        $seconds =
            RateLimiter::availableIn(
                $this->throttleKey()
            );

        throw ValidationException::withMessages([
            'email' => trans(
                'auth.throttle',
                [
                    'seconds' =>
                        $seconds,

                    'minutes' =>
                        ceil(
                            $seconds / 60
                        ),
                ]
            ),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(
            Str::lower(
                $this->string('email')
            )
            . '|'
            . $this->ip()
        );
    }
}