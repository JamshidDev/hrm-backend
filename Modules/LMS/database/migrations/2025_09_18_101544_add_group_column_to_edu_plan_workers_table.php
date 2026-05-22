<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\LMS\Enums\ListenerStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::table('edu_plan_workers', static function (Blueprint $table) {
            $table->foreignId('group_id')
                ->nullable()
                ->after('worker_position_id')
                ->constrained('groups')
                ->cascadeOnDelete();

            $table->tinyInteger('status')
                ->after('group_id')
                ->default(ListenerStatusEnum::ONE->value);
        });

    }


    public function down(): void
    {
        Schema::table('edu_plan_workers', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('group_id');
            $table->dropColumn('status');
        });
    }
};
