<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountUpdatedNotification extends Notification
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Account Was Updated'
            )
            ->view(
                'emails.account-updated',
                [
                    'title' =>
                        'HIMS Fleet Account Updated',

                    'user' =>
                        $notifiable,
                ]
            );
    }
}