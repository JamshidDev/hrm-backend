<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('hcp:sync-events')->cron('*/7 * * * *');
Schedule::command('hcp:sync-invalid-workers')->everyTenMinutes();
Schedule::command('telegram:send-birthdays')->dailyAt('07:50');
//Schedule::command('telegram:send-stats')->dailyAt('07:00');
