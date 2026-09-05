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

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Account Was Removed'
            )
            ->view(
                'emails.account-deleted',
                [
                    'title' =>
                        'HIMS Fleet Account Removed',

                    'name' =>
                        $this->name,
                ]
            );
    }
}