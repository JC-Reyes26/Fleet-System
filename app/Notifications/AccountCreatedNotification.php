<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountCreatedNotification extends Notification
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
                'Your HIMS Fleet Account Has Been Created'
            )
            ->greeting(
                "Hello {$name},"
            )
            ->line(
                'An account has been created for you in the HIMS Fleet & Transportation Management System.'
            )
            ->line(
                'Login Email: ' .
                $notifiable->email
            )
            ->line(
                'Password: ' .
                $this->plainPassword
            )
            ->line(
                'Role: ' .
                $role
            )
            ->action(
                'Open HIMS Fleet',
                url('/login')
            )
            ->line(
                'You may change your password later from your profile.'
            )
            ->line(
                'If you were not expecting this account, please contact the system administrator.'
            );
    }
}