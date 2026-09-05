<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <meta
        name="color-scheme"
        content="light"
    >

    <title>
        {{ $title ?? 'HIMS Fleet & Transportation' }}
    </title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#f3f6f5;
        font-family:Arial, Helvetica, sans-serif;
        color:#1f2937;
        -webkit-text-size-adjust:100%;
    "
>

<table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    role="presentation"
    style="
        width:100%;
        background:#f3f6f5;
    "
>
    <tr>
        <td
            align="center"
            style="
                padding:40px 16px;
            "
        >

            <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                role="presentation"
                style="
                    width:100%;
                    max-width:620px;
                    background:#ffffff;
                    border-radius:14px;
                    overflow:hidden;
                    border:1px solid #e5e7eb;
                    box-shadow:0 6px 24px rgba(15, 23, 42, 0.08);
                "
            >

                {{-- ==========================================
                     HIMS FLEET BRAND HEADER
                ========================================== --}}
                <tr>
                    <td
                        style="
                            background:#00A86B;
                            padding:24px 30px;
                            color:#ffffff;
                        "
                    >
                        <table
                            cellpadding="0"
                            cellspacing="0"
                            border="0"
                            role="presentation"
                        >
                            <tr>

                                {{-- LOGO --}}
                                <td
                                    style="
                                        width:54px;
                                        vertical-align:middle;
                                    "
                                >
                                    <img
                                        src="{{ asset('assets/images/brand/favicon.png') }}"
                                        alt="HIMS Fleet"
                                        width="44"
                                        height="44"
                                        style="
                                            display:block;
                                            width:44px;
                                            height:44px;
                                            max-width:44px;
                                            object-fit:contain;
                                            border:0;
                                        "
                                    >
                                </td>

                                {{-- BRAND TEXT --}}
                                <td
                                    style="
                                        vertical-align:middle;
                                        padding-left:12px;
                                    "
                                >
                                    <div
                                        style="
                                            margin:0;
                                            font-size:20px;
                                            line-height:1.2;
                                            font-weight:700;
                                            color:#ffffff;
                                        "
                                    >
                                        HIMS Fleet
                                    </div>

                                    <div
                                        style="
                                            margin-top:2px;
                                            font-size:13px;
                                            line-height:1.3;
                                            font-weight:600;
                                            color:#ffffff;
                                        "
                                    >
                                        Fleet &amp; Transportation
                                    </div>

                                    <div
                                        style="
                                            margin-top:3px;
                                            font-size:11px;
                                            line-height:1.3;
                                            color:#d9fff0;
                                        "
                                    >
                                        Hospital Operations Suite
                                    </div>
                                </td>

                            </tr>
                        </table>
                    </td>
                </tr>

                {{-- ==========================================
                     EMAIL CONTENT
                ========================================== --}}
                <tr>
                    <td
                        style="
                            padding:32px;
                        "
                    >
                        @yield('content')
                    </td>
                </tr>

                {{-- ==========================================
                     FOOTER
                ========================================== --}}
                <tr>
                    <td
                        style="
                            padding:20px 30px;
                            background:#f8faf9;
                            border-top:1px solid #e5e7eb;
                            text-align:center;
                        "
                    >
                        <p
                            style="
                                margin:0;
                                color:#6b7280;
                                font-size:12px;
                                line-height:1.6;
                            "
                        >
                            HIMS Fleet &amp; Transportation Management System
                        </p>

                        <p
                            style="
                                margin:4px 0 0;
                                color:#9ca3af;
                                font-size:11px;
                                line-height:1.5;
                            "
                        >
                            Hospital Operations Suite
                        </p>

                        <p
                            style="
                                margin:10px 0 0;
                                color:#9ca3af;
                                font-size:11px;
                                line-height:1.5;
                            "
                        >
                            This is an automated system notification.
                            Please do not reply to this email.
                        </p>
                    </td>
                </tr>

            </table>

        </td>
    </tr>
</table>

</body>
</html>