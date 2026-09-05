<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PasswordResetByAdminNotification extends Notification
{
    use Queueable;

    public function __construct(
        private string $plainPassword
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
                'Your HIMS Fleet Password Was Reset'
            )
            ->view(
                'emails.password-reset',
                [
                    'title' =>
                        'HIMS Fleet Password Reset',

                    'user' =>
                        $notifiable,

                    'plainPassword' =>
                        $this->plainPassword,
                ]
            );
    }
}