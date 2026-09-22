@extends('emails.layouts.hims-fleet')

@section('content')

    <h2 style="
        margin: 0 0 16px;
        color: #1f2937;
        font-size: 22px;
    ">
        Password Recovery
    </h2>

    <p style="
        margin: 0 0 16px;
        color: #4b5563;
        line-height: 1.6;
    ">
        Hello {{ $user->first_name ?? $user->name }},
    </p>

    <p style="
        margin: 0 0 20px;
        color: #4b5563;
        line-height: 1.6;
    ">
        We received a request to recover your
        HIMS Fleet account. Use the verification
        code below to continue.
    </p>

    <div style="
        margin: 25px 0;
        padding: 20px;
        text-align: center;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 10px;
    ">
        <div style="
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 8px;
        ">
            Verification Code
        </div>

        <div style="
            color: #00A86B;
            font-size: 34px;
            font-weight: 700;
            letter-spacing: 8px;
        ">
            {{ $code }}
        </div>
    </div>

    <p style="
        margin: 0 0 12px;
        color: #4b5563;
        line-height: 1.6;
    ">
        This code expires in
        <strong>5 minutes</strong>.
    </p>

    <p style="
        margin: 0;
        color: #6b7280;
        line-height: 1.6;
        font-size: 13px;
    ">
        If you did not request a password recovery,
        you can safely ignore this email.
    </p>

@endsection