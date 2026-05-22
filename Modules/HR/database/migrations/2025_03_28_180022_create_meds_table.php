<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\MedStatusEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('meds', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();

            $table->foreignId('worker_position_id')->nullable()
                ->constrained('worker_positions')->cascadeOnDelete();

            $table->foreignId('organization_id')->nullable()->constrained('organizations');
            $table->tinyInteger('status')->default(MedStatusEnum::ONE->value);
            $table->date('from')->nullable();
            $table->date('to')->nullable();
            $table->string('file')->nullable();
            $table->text('comment')->nullable();
            $table->boolean('current')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'from'], 'unique_worker_med_date');
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('meds');
    }
};
