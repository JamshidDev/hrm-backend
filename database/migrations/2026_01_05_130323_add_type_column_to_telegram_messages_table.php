<?php

use App\Enums\TelegramMessageTypeEnum;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('telegram_messages', function (Blueprint $table) {
            $table->tinyInteger('type')->default(TelegramMessageTypeEnum::BIRTHDAYS->value)->after('status');
        });
    }


    public function down(): void
    {
        Schema::table('telegram_messages', function (Blueprint $table) {
            $table->dropColumn('type');
        });
    }
};
