@extends('emails.layouts.hims-fleet')

@section('content')

<h2 style="margin:0 0 18px; font-size:22px; color:#111827;">
    Your account was removed
</h2>

<p style="margin:0 0 14px; line-height:1.6; color:#374151;">
    Hello
    <strong>
        {{ $name ?: 'User' }}
    </strong>,
</p>

<p style="margin:0 0 18px; line-height:1.6; color:#4b5563;">
    Your account in the HIMS Fleet &amp; Transportation Management System
    has been removed by an administrator.
</p>

<p style="margin:0 0 18px; line-height:1.6; color:#4b5563;">
    You will no longer be able to sign in using this account.
</p>

<p style="margin:0; line-height:1.6; color:#6b7280; font-size:13px;">
    If you believe this was done in error,
    please contact the system administrator.
</p>

@endsection