@extends('emails.layouts.hims-fleet')

@section('content')

<h2 style="margin:0 0 18px; font-size:22px; color:#111827;">
    Your password was reset
</h2>

<p style="margin:0 0 14px; line-height:1.6; color:#374151;">
    Hello
    <strong>
        {{ $user->first_name ?: $user->name ?: 'User' }}
    </strong>,
</p>

<p style="margin:0 0 24px; line-height:1.6; color:#4b5563;">
    An administrator reset the password for your HIMS Fleet account.
</p>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    role="presentation"
    style="
        background:#f8faf9;
        border:1px solid #dfe7e3;
        border-radius:10px;
    "
>
    <tr>
        <td style="padding:18px 20px 6px; color:#6b7280; font-size:11px; font-weight:700; text-transform:uppercase;">
            Login Email
        </td>
    </tr>

    <tr>
        <td style="padding:0 20px 17px; color:#111827; font-size:15px; font-weight:600;">
            {{ $user->email }}
        </td>
    </tr>

    <tr>
        <td style="padding:0 20px 6px; color:#6b7280; font-size:11px; font-weight:700; text-transform:uppercase;">
            New Password
        </td>
    </tr>

    <tr>
        <td style="padding:0 20px 19px; color:#111827; font-size:15px; font-weight:600;">
            {{ $plainPassword }}
        </td>
    </tr>
</table>

<div style="text-align:center; margin:28px 0;">
    <a
        href="{{ url('/login') }}"
        style="
            display:inline-block;
            padding:13px 24px;
            background:#00A86B;
            color:#ffffff;
            text-decoration:none;
            border-radius:8px;
            font-weight:700;
        "
    >
        Sign In to HIMS Fleet
    </a>
</div>

<p style="margin:0; line-height:1.6; color:#6b7280; font-size:13px;">
    You may change this password later from your profile.
</p>

@endsection