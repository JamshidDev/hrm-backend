<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\HR\Enums\PartyEnum;

return new class extends Migration {

    public function up(): void
    {
        Schema::create('worker_parties', static function (Blueprint $table) {
            $table->id();
            $table->foreignId('worker_id')->constrained('workers');
            $table->tinyInteger('party')->default(PartyEnum::TWO->value);
            $table->date('from_date');
            $table->date('to_date')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('worker_parties');
    }
};
