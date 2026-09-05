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
        $name =
            $notifiable->first_name
            ?: $notifiable->name
            ?: 'User';

        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Password Was Reset'
            )
            ->greeting(
                "Hello {$name},"
            )
            ->line(
                'An administrator reset the password for your HIMS Fleet account.'
            )
            ->line(
                'Login Email: ' .
                $notifiable->email
            )
            ->line(
                'New Password: ' .
                $this->plainPassword
            )
            ->action(
                'Sign In',
                url('/login')
            )
            ->line(
                'You can change this password later from your profile.'
            );
    }
}