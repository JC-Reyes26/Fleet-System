<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\VehicleController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\DispatchController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\FuelLogController;
use App\Http\Controllers\RoutePlanController;
use App\Http\Controllers\CostBudgetController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\FleetNotificationController;
use App\Http\Controllers\FleetSearchController;
use App\Http\Controllers\CostAnalysisController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserAccountController;


/*
|--------------------------------------------------------------------------
| PUBLIC ROUTES
|--------------------------------------------------------------------------
*/  
Route::get('/', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
});


/*
|--------------------------------------------------------------------------
| AUTH ROUTES
|--------------------------------------------------------------------------
*/
require __DIR__.'/auth.php';


/*
|--------------------------------------------------------------------------
| AUTHENTICATED FLEET ROUTES
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'verified'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | GLOBAL SERVICES
    |--------------------------------------------------------------------------
    |
    | These are shared across Fleet pages and should not be tied to one
    | specific module.
    |
    */
    Route::get(
        '/notifications',
        [FleetNotificationController::class, 'index']
    )->name('notifications.index');

    Route::patch(
        '/notifications/read-all',
        [FleetNotificationController::class, 'markAllRead']
    )->name('notifications.readAll');

    Route::patch(
        '/notifications/{notification}/read',
        [FleetNotificationController::class, 'markRead']
    )->name('notifications.read');

    Route::get(
        '/fleet-search',
        [FleetSearchController::class, 'search']
    )->name('fleet.search');


    /*
    |--------------------------------------------------------------------------
    | SHARED SETTINGS DATA
    |--------------------------------------------------------------------------
    |
    | Navbar and other Fleet components read these settings.
    | Do not place this route inside the Settings RBAC group.
    |
    */
    Route::get(
        '/settings/data',
        [SettingsController::class, 'show']
    )->name('settings.data');


    /*
    |--------------------------------------------------------------------------
    | DASHBOARD
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:dashboard')->group(function () {

        Route::get(
            '/dashboard',
            [DashboardController::class, 'index']
        )->name('dashboard');

    });


    /*
    |--------------------------------------------------------------------------
    | PROFILE
    |--------------------------------------------------------------------------
    |
    | All approved roles have at least Limited Access to Profile.
    | Ownership / administrative rules will be enforced by policy.
    |
    */
    Route::get(
        '/profile',
        [ProfileController::class, 'edit']
    )->name('profile.edit');

    Route::patch(
        '/profile',
        [ProfileController::class, 'update']
    )->name('profile.update');

    Route::put(
        '/profile/password',
        [ProfileController::class, 'updatePassword']
    )->name('profile.password.update');

    Route::delete(
        '/profile',
        [ProfileController::class, 'destroy']
    )->name('profile.destroy');


    /*
    |--------------------------------------------------------------------------
    | VEHICLE MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:vehicles')->group(function () {

        Route::get(
            '/fleet/search',
            [VehicleController::class, 'index']
        );

        Route::get(
            '/fleet/stats',
            [VehicleController::class, 'stats']
        )->name('vehicles.stats');

        Route::delete(
            '/fleet/bulk-delete',
            [VehicleController::class, 'bulkDelete']
        )->name('vehicles.bulkDelete');

        Route::get(
            '/fleet',
            [VehicleController::class, 'index']
        )->name('fleet');

        Route::get(
            '/fleet/available',
            [VehicleController::class, 'available']
        );

        Route::post(
            '/fleet',
            [VehicleController::class, 'store']
        )->name('vehicles.store');

        Route::get(
            '/fleet/{vehicle}',
            [VehicleController::class, 'show']
        )->name('vehicles.show');

        Route::put(
            '/fleet/{vehicle}',
            [VehicleController::class, 'update']
        )->name('vehicles.update');

        Route::delete(
            '/fleet/{vehicle}',
            [VehicleController::class, 'destroy']
        )->name('vehicles.destroy');

    });


    /*
    |--------------------------------------------------------------------------
    | RESERVATION MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:reservations')->group(function () {

        Route::get(
            '/reservation/stats',
            [ReservationController::class, 'stats']
        )->name('reservation.stats');

        Route::get(
            '/reservation/next-number',
            [ReservationController::class, 'nextNumber']
        )->name('reservation.next-number');

        Route::delete(
            '/reservation/bulk-delete',
            [ReservationController::class, 'bulkDelete']
        )->name('reservation.bulkDelete');

        Route::resource(
            'reservation',
            ReservationController::class
        );

    });


    /*
    |--------------------------------------------------------------------------
    | DISPATCH MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:dispatch')->group(function () {

        Route::get(
            '/dispatch',
            [DispatchController::class, 'index']
        )->name('dispatch');

        Route::get(
            '/dispatch/available-reservations',
            [DispatchController::class, 'availableReservations']
        )->name('dispatch.availableReservations');

        Route::get(
            '/dispatch/next-number',
            [DispatchController::class, 'nextNumber']
        )->name('dispatch.next-number');

        Route::post(
            '/dispatch',
            [DispatchController::class, 'store']
        )->name('dispatch.store');

        Route::delete(
            '/dispatch/bulk-delete',
            [DispatchController::class, 'bulkDelete']
        )->name('dispatch.bulkDelete');

        Route::get(
            '/dispatch/{dispatch}',
            [DispatchController::class, 'show']
        )->name('dispatch.show');

        Route::put(
            '/dispatch/{dispatch}',
            [DispatchController::class, 'update']
        )->name('dispatch.update');

        Route::delete(
            '/dispatch/{dispatch}',
            [DispatchController::class, 'destroy']
        )->name('dispatch.destroy');

    });


    /*
    |--------------------------------------------------------------------------
    | DRIVER MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:drivers')->group(function () {

        Route::delete(
            '/drivers/bulk-delete',
            [DriverController::class, 'bulkDelete']
        )->name('drivers.bulkDelete');

        Route::get(
            '/driver',
            [DriverController::class, 'index']
        )->name('driver');

        Route::get(
            '/drivers',
            [DriverController::class, 'getDrivers']
        );

        Route::get(
            '/drivers/available',
            [DriverController::class, 'available']
        );

        Route::post(
            '/drivers/{driver}/create-account',
            [DriverController::class, 'createAccount']
        )->name('drivers.create-account');

        Route::post(
            '/drivers',
            [DriverController::class, 'store']
        )->name('drivers.store');

        Route::get(
            '/drivers/{driver}',
            [DriverController::class, 'show']
        )->name('drivers.show');

        Route::put(
            '/drivers/{driver}',
            [DriverController::class, 'update']
        )->name('drivers.update');

        Route::delete(
            '/drivers/{driver}',
            [DriverController::class, 'destroy']
        )->name('drivers.destroy');

    });


    /*
    |--------------------------------------------------------------------------
    | MAINTENANCE MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:maintenance')->group(function () {

        Route::get(
            '/maintenance',
            [MaintenanceController::class, 'index']
        )->name('maintenance');

        Route::get(
            '/maintenance/available-vehicles',
            [MaintenanceController::class, 'availableVehicles']
        )->name('maintenance.availableVehicles');

        Route::get(
            '/maintenance/next-number',
            [MaintenanceController::class, 'nextNumber']
        )->name('maintenance.next-number');

        Route::post(
            '/maintenance',
            [MaintenanceController::class, 'store']
        )->name('maintenance.store');

        Route::get(
            '/maintenance/{maintenance}',
            [MaintenanceController::class, 'show']
        )->name('maintenance.show');

        Route::put(
            '/maintenance/{maintenance}',
            [MaintenanceController::class, 'update']
        )->name('maintenance.update');

        Route::delete(
            '/maintenance/bulk-delete',
            [MaintenanceController::class, 'bulkDelete']
        )->name('maintenance.bulkDelete');

        Route::delete(
            '/maintenance/{maintenance}',
            [MaintenanceController::class, 'destroy']
        )->name('maintenance.destroy');

    });


    /*
    |--------------------------------------------------------------------------
    | FUEL MANAGEMENT MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:fuel')->group(function () {

        Route::get(
            '/fuel',
            [FuelLogController::class, 'page']
        )->name('fuel');

        Route::get(
            '/fuel-records',
            [FuelLogController::class, 'index']
        )->name('fuel.index');

        Route::get(
            '/fuel-records/next-number',
            [FuelLogController::class, 'nextNumber']
        )->name('fuel.next-number');

        Route::post(
            '/fuel-records',
            [FuelLogController::class, 'store']
        )->name('fuel.store');

        Route::delete(
            '/fuel-records/bulk-delete',
            [FuelLogController::class, 'bulkDelete']
        )->name('fuel.bulk-delete');

        Route::get(
            '/fuel-records/{fuelLog}',
            [FuelLogController::class, 'show']
        )->name('fuel.show');

        Route::put(
            '/fuel-records/{fuelLog}',
            [FuelLogController::class, 'update']
        )->name('fuel.update');

        Route::delete(
            '/fuel-records/{fuelLog}',
            [FuelLogController::class, 'destroy']
        )->name('fuel.destroy');

    });


    /*
    |--------------------------------------------------------------------------
    | ROUTE PLANNING MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:route_planning')->group(function () {

        Route::get(
            '/route-planning',
            [RoutePlanController::class, 'index']
        )->name('route-planning');

        Route::get(
            '/route-planning/available-reservations',
            [RoutePlanController::class, 'availableReservations']
        )->name('route-planning.availableReservations');

        Route::get(
            '/route-planning/stats',
            [RoutePlanController::class, 'stats']
        )->name('route-planning.stats');

        Route::get(
            '/route-planning/next-number',
            [RoutePlanController::class, 'nextNumber']
        )->name('route-planning.nextNumber');

        Route::get(
            '/route-planning/{routePlan}',
            [RoutePlanController::class, 'show']
        )->name('route-planning.show');

        Route::post(
            '/route-planning',
            [RoutePlanController::class, 'store']
        )->name('route-planning.store');

        Route::put(
            '/route-planning/{routePlan}',
            [RoutePlanController::class, 'update']
        )->name('route-planning.update');

        Route::delete(
            '/route-planning/{routePlan}',
            [RoutePlanController::class, 'destroy']
        )->name('route-planning.destroy');

        Route::post(
            '/route-planning/{routePlan}/archive',
            [RoutePlanController::class, 'archive']
        )->name('route-planning.archive');

        Route::post(
            '/route-planning/{routePlan}/restore',
            [RoutePlanController::class, 'restore']
        )->name('route-planning.restore');

        Route::post(
            '/route-planning/{routePlan}/duplicate',
            [RoutePlanController::class, 'duplicate']
        )->name('route-planning.duplicate');

    });


    /*
    |--------------------------------------------------------------------------
    | COST ANALYSIS MODULE
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:cost_analysis')->group(function () {

        Route::view(
            '/cost-analysis',
            'cost-analysis.index'
        )->name('cost-analysis');

        Route::get(
            '/cost-analysis/data',
            [CostAnalysisController::class, 'data']
        )->name('cost-analysis.data');

        Route::get(
            '/cost-analysis/budget',
            [CostBudgetController::class, 'show']
        )->name('cost-analysis.budget.show');

        Route::put(
            '/cost-analysis/budget',
            [CostBudgetController::class, 'save']
        )->name('cost-analysis.budget.save');

        Route::delete(
            '/cost-analysis/budget',
            [CostBudgetController::class, 'clear']
        )->name('cost-analysis.budget.clear');

        Route::get(
            '/cost-analysis/budget/history',
            [CostBudgetController::class, 'history']
        )->name('cost-analysis.budget.history');

        Route::delete(
            '/cost-analysis/budget/history',
            [CostBudgetController::class, 'clearHistory']
        )->name('cost-analysis.budget.history.clear');

    });


    /*
    |--------------------------------------------------------------------------
    | REPORTS
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:reports')->group(function () {

        Route::get(
            '/reports',
            [ReportController::class, 'index']
        )->name('reports');

        Route::get(
            '/reports/data',
            [ReportController::class, 'data']
        )->name('reports.data');

    });


    /*
    |--------------------------------------------------------------------------
    | SETTINGS
    |--------------------------------------------------------------------------
    */
    Route::middleware('fleet.module:settings')->group(function () {

        Route::get(
            '/settings',
            [SettingsController::class, 'index']
        )->name('settings');

        Route::get(
            '/settings/accounts',
            [UserAccountController::class, 'index']
        )->name('settings.accounts.index');

        Route::post(
            '/settings/accounts',
            [UserAccountController::class, 'store']
        )->name('settings.accounts.store');

        Route::get(
            '/settings/accounts/{user}',
            [UserAccountController::class, 'show']
        )->name('settings.accounts.show');

        Route::patch(
            '/settings/accounts/{user}',
            [UserAccountController::class, 'update']
        )->name('settings.accounts.update');

        Route::put(
            '/settings',
            [SettingsController::class, 'update']
        )->name('settings.update');

        Route::post(
            '/settings/reset',
            [SettingsController::class, 'reset']
        )->name('settings.reset');

        Route::post(
            '/settings/accounts/{user}/reset-password',
            [UserAccountController::class, 'resetPassword']
        )->name('settings.accounts.reset-password');

        Route::delete(
            '/settings/accounts/{user}',
            [UserAccountController::class, 'destroy']
        )->name('settings.accounts.destroy');

    });
    
});