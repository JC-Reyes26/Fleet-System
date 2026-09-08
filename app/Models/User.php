<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable([
    'name',
    'first_name',
    'middle_name',
    'last_name',
    'email',
    'employee_id',
    'department',
    'job_title',
    'mobile_number',
    'office_extension',
    'office_location',
    'profile_photo',
    'password',
    'role',
    'status',
    'last_login_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array(
            $this->role,
            $roles,
            true
        );
    }

    public function moduleAccess(string $module): string
    {
        if (!$this->role) {
            return 'none';
        }

        return config(
            "fleet_rbac.modules.{$module}.{$this->role}",
            'none'
        );
    }

    public function canModuleAction(
        string $module,
        string $action
    ): bool {
        $accessLevel =
            $this->moduleAccess($module);

        $permissions = config(
            "fleet_rbac.access_levels.{$accessLevel}",
            []
        );

        return in_array(
            $action,
            $permissions,
            true
        );
    }

    public function canAccessModule(string $module): bool
    {
        return $this->moduleAccess($module) !== 'none';
    }

    public function canViewModule(string $module): bool
    {
        return in_array(
            $this->moduleAccess($module),
            ['full', 'limited', 'view'],
            true
        );
    }

    public function hasFullAccess(string $module): bool
    {
        return $this->moduleAccess($module) === 'full';
    }

    public function driverProfile()
    {
        return $this->hasOne(
            \App\Models\Driver::class
        );
    }

    public function reservationsRequested()
    {
        return $this->hasMany(
            \App\Models\Reservation::class,
            'requested_by'
        );
    }

    public function auditLogs()
    {
        return $this->hasMany(
            \App\Models\AuditLog::class
        );
    }
}


