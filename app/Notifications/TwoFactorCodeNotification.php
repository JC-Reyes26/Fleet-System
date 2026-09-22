<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TwoFactorCodeNotification extends Notification
{
    use Queueable;

    public function __construct(
        private string $code
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Two-Factor Authentication Code'
            )
            ->view(
                'emails.two-factor-code',
                [
                    'title' =>
                        'HIMS Fleet Two-Factor Authentication',

                    'user' =>
                        $notifiable,

                    'code' =>
                        $this->code,
                ]
            );
    }
}