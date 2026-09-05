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

    public function toMail(
        object $notifiable
    ): MailMessage {
        return (new MailMessage)
            ->subject(
                'Your HIMS Fleet Account Has Been Created'
            )
            ->view(
                'emails.account-created',
                [
                    'title' =>
                        'HIMS Fleet Account Created',

                    'user' =>
                        $notifiable,

                    'plainPassword' =>
                        $this->plainPassword,
                ]
            );
    }
}