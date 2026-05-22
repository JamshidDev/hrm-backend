<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('department_positions', function (Blueprint $table) {
            $table->tinyInteger('status')->default(\Modules\Confirmation\Enums\ConfirmationStatusEnum::PROCESS->value)->index();
            $table->tinyInteger('changed_status')->default(\Modules\Confirmation\Enums\ConfirmationStatusEnum::PROCESS->value)->index();
        });
    }


    public function down(): void
    {
        Schema::table('department_positions', function (Blueprint $table) {
            $table->dropColumn('status');
            $table->dropColumn('changed_status');
        });
    }
};
