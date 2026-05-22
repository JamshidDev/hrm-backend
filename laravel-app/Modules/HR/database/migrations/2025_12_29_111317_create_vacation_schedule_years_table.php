<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Confirmation\Enums\ConfirmationStatusEnum;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('vacation_schedule_years', function (Blueprint $table) {
            $table->uuid();
            $table->id();
            $table->smallInteger('year');
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('director_id')->nullable()->constrained('confirmation_workers');
            $table->foreignId('trade_union_id')->nullable()->constrained('confirmation_workers');
            $table->foreignId('creator_id')->nullable()->constrained('workers');
            $table->date('date')->nullable();
            $table->string('number')->nullable();
            $table->string('file')->nullable();
            $table->string('confirmation_file')->nullable();
            $table->tinyInteger('generate')->default(1);
            $table->tinyInteger('confirmation')->index()->default(ConfirmationStatusEnum::PROCESS->value);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacation_schedule_years');
    }
};
