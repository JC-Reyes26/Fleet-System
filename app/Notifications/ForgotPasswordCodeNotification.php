<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ForgotPasswordCodeNotification extends Notification
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
                'Your HIMS Fleet Password Recovery Code'
            )
            ->view(
                'emails.forgot-password-code',
                [
                    'title' =>
                        'HIMS Fleet Password Recovery',

                    'user' =>
                        $notifiable,

                    'code' =>
                        $this->code,
                ]
            );
    }
}