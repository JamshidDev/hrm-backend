<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\ConfirmationWorkerLevelEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('confirmation_workers', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->tinyInteger('level')->default(ConfirmationWorkerLevelEnum::DIRECTOR->value);
            $table->string('position')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('confirmation_workers');
    }
};
