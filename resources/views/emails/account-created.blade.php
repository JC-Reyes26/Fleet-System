@extends('emails.layouts.hims-fleet')

@section('content')

<h2
    style="
        margin:0 0 18px;
        font-size:22px;
        line-height:1.3;
        color:#111827;
    "
>
    Your account has been created
</h2>

<p
    style="
        margin:0 0 14px;
        line-height:1.6;
        color:#374151;
    "
>
    Hello
    <strong>
        {{ $user->first_name ?: $user->name ?: 'User' }}
    </strong>,
</p>

<p
    style="
        margin:0 0 24px;
        line-height:1.6;
        color:#4b5563;
    "
>
    An account has been created for you in the
    HIMS Fleet &amp; Transportation Management System.
    Use the credentials below to sign in.
</p>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    role="presentation"
    style="
        background:#f8faf9;
        border:1px solid #dfe7e3;
        border-radius:10px;
    "
>
    <tr>
        <td
            style="
                padding:18px 20px 6px;
                color:#6b7280;
                font-size:11px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:.04em;
            "
        >
            Login Email
        </td>
    </tr>

    <tr>
        <td
            style="
                padding:0 20px 17px;
                color:#111827;
                font-size:15px;
                font-weight:600;
            "
        >
            {{ $user->email }}
        </td>
    </tr>

    <tr>
        <td
            style="
                padding:0 20px 6px;
                color:#6b7280;
                font-size:11px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:.04em;
            "
        >
            Password
        </td>
    </tr>

    <tr>
        <td
            style="
                padding:0 20px 17px;
                color:#111827;
                font-size:15px;
                font-weight:600;
            "
        >
            {{ $plainPassword }}
        </td>
    </tr>

    <tr>
        <td
            style="
                padding:0 20px 6px;
                color:#6b7280;
                font-size:11px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:.04em;
            "
        >
            Role
        </td>
    </tr>

    <tr>
        <td
            style="
                padding:0 20px 19px;
                color:#111827;
                font-size:15px;
                font-weight:600;
            "
        >
            {{ ucwords(str_replace('_', ' ', $user->role)) }}
        </td>
    </tr>
</table>

<div
    style="
        margin:28px 0;
        text-align:center;
    "
>
    <a
        href="{{ url('/login') }}"
        style="
            display:inline-block;
            padding:13px 24px;
            background:#00A86B;
            color:#ffffff;
            text-decoration:none;
            border-radius:8px;
            font-size:14px;
            font-weight:700;
        "
    >
        Open HIMS Fleet
    </a>
</div>

<p
    style="
        margin:0 0 10px;
        line-height:1.6;
        color:#4b5563;
        font-size:14px;
    "
>
    You may change your password later from your profile.
</p>

<p
    style="
        margin:0;
        line-height:1.6;
        color:#6b7280;
        font-size:13px;
    "
>
    If you were not expecting this account,
    please contact the system administrator.
</p>

@endsection