<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'HIMS Fleet')</title>
    <link rel="icon" href="{{ asset('assets/images/brand/favicon.svg') }}" type="image/svg+xml">
    <link
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.7/dist/css/bootstrap.min.css"
      rel="stylesheet"
    />
    <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <script src="{{ asset('assets/js/core/theme-boot.js') }}"></script>
    <!--
    <script src="{{ asset('assets/js/core/auth-boot.js') }}"></script>-->
    <link rel="stylesheet" href="{{ asset('assets/css/style.css') }}">
</head>

<body>

    <div class="app">

        @include('components.shared.sidebar')

        <div class="main-content">

            @include('components.shared.navbar')

            @yield('content')

        </div>

    </div>

    @include('components.shared.toast')
    
    <!--
    <script src="{{ asset('assets/js/core/auth.js') }}"></script>-->
    <script src="{{ asset('assets/js/components/navbar.js') }}"></script>
    <script src="{{ asset('assets/js/core/toast.js') }}"></script>
    <script src="{{ asset('assets/js/core/main.js') }}"></script>
    <script src="{{ asset('assets/js/fleet-gps.js') }}"></script>
    
    @stack('scripts')

    
</body>
</html>
