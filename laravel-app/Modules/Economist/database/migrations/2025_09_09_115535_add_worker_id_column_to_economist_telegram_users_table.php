<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Economist\Models\EconomistTelegramUser;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('economist_telegram_users', static function (Blueprint $table) {
            $table->foreignId('worker_id')
                ->nullable()
                ->after('user_id')
                ->constrained('workers');
        });

        foreach (EconomistTelegramUser::with('user')->get() as $item) {
            $item->worker_id = $item->user->worker_id;
            $item->save();
        }
    }


    public function down(): void
    {
        Schema::table('economist_telegram_users', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('worker_id');
        });
    }
};
