<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="shortcut icon" href="{{ asset(mix('img/log-viewer-32.png', 'vendor/log-viewer')) }}">

    <title>HRM Logs</title>

    <!-- Style sheets-->
    <link href="{{ asset(mix('app.css', 'vendor/log-viewer')) }}" rel="stylesheet"
          onerror="alert('app.css failed to load. Please refresh the page, re-publish Log Viewer assets, or fix routing for vendor assets.')">

    <style>
        a[href*="/"] {
            display: none !important;
        }
    </style>
</head>

<body class="h-full px-3 lg:px-5 bg-gray-100 dark:bg-gray-900">
<div id="log-viewer" class="flex h-full max-h-screen max-w-full">
    <router-view></router-view>
</div>

<script>
    window.LogViewer = @json($logViewerScriptVariables);
</script>
<script src="{{ asset(mix('app.js', 'vendor/log-viewer')) }}"
        onerror="alert('app.js failed to load. Please refresh the page, re-publish Log Viewer assets, or fix routing for vendor assets.')"></script>

</body>
</html>
