<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\VacationTypeEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('vacations', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->foreignId('worker_position_id')->constrained('worker_positions')->cascadeOnDelete();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('contract_id')->constrained('contracts')->cascadeOnDelete();
            $table->foreignId('command_id')->nullable()->constrained('commands')->cascadeOnDelete();
            $table->tinyInteger('type')->default(VacationTypeEnum::ONE->value)->index();
            $table->integer('main_day')->default(0);
            $table->integer('second_day')->default(0);
            $table->integer('all_day')->default(0);
            $table->integer('rest_day')->default(0);
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->date('from')->nullable()->index();
            $table->date('to')->nullable()->index();
            $table->date('work_day')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('vacations');
    }
};
