<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountDeletedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private string $name = 'User'
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(
        object $notifiable
    ): MailMessage {
        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Account Was Removed'
            )
            ->greeting(
                "Hello {$this->name},"
            )
            ->line(
                'Your account in the HIMS Fleet & Transportation Management System has been removed by an administrator.'
            )
            ->line(
                'You will no longer be able to sign in using this account.'
            )
            ->line(
                'If you believe this was done in error, please contact the system administrator.'
            );
    }
}