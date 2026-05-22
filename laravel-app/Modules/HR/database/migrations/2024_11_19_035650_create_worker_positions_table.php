<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\PositionStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_positions', static function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->foreignId('organization_id')->nullable()->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->cascadeOnDelete();
            $table->foreignId('department_position_id')
                ->nullable()->constrained('department_positions')->cascadeOnDelete();
            $table->foreignId('position_id')->nullable()->constrained('positions')->cascadeOnDelete();
            $table->foreignId('contract_id')->nullable()->constrained('contracts')->cascadeOnDelete();
            $table->foreignId('worker_id')->nullable()->constrained('workers')->cascadeOnDelete();
            $table->foreignId('command_id')->nullable()->constrained('commands')->cascadeOnDelete();
            $table->integer('type')->index();
            $table->date('position_date');
            $table->boolean('contract_position')->default(false);
            $table->boolean('overstaffed')->default(false);
            $table->tinyInteger('probation')->default(0);
            $table->tinyInteger('vacation_main_day')->default(0);
            $table->tinyInteger('additional_vacation_day')->default(0);
            $table->tinyInteger('group')->default(0);
            $table->string('rank', 3)->nullable();
            $table->tinyInteger('rate')->default(100)->index();
            $table->bigInteger('salary')->nullable();
            $table->text('post_name')->nullable();
            $table->tinyInteger('status')->index()->default(PositionStatusEnum::ACTIVE->value)->index();
            $table->integer('external')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_positions');
    }
};
