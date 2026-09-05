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
    Your account information was updated
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
    Your HIMS Fleet account information has been updated by an administrator.
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
        <td style="padding:18px 20px 6px; color:#6b7280; font-size:11px; font-weight:700; text-transform:uppercase;">
            Email
        </td>
    </tr>

    <tr>
        <td style="padding:0 20px 17px; color:#111827; font-size:15px; font-weight:600;">
            {{ $user->email }}
        </td>
    </tr>

    <tr>
        <td style="padding:0 20px 6px; color:#6b7280; font-size:11px; font-weight:700; text-transform:uppercase;">
            Role
        </td>
    </tr>

    <tr>
        <td style="padding:0 20px 19px; color:#111827; font-size:15px; font-weight:600;">
            {{ ucwords(str_replace('_', ' ', $user->role)) }}
        </td>
    </tr>
</table>

<p
    style="
        margin:24px 0 0;
        line-height:1.6;
        color:#6b7280;
        font-size:13px;
    "
>
    If you did not expect these changes,
    please contact the system administrator.
</p>

@endsection