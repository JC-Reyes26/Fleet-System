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
        $role = ucwords(
            str_replace(
                '_',
                ' ',
                (string) $notifiable->role
            )
        );

        $name =
            $notifiable->first_name
            ?: $notifiable->name
            ?: 'User';

        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Account Was Updated'
            )
            ->greeting(
                "Hello {$name},"
            )
            ->line(
                'Your HIMS Fleet account information has been updated by an administrator.'
            )
            ->line(
                'Email: ' .
                $notifiable->email
            )
            ->line(
                'Role: ' .
                $role
            )
            ->line(
                'If you did not expect these changes, please contact the system administrator.'
            );
    }
}