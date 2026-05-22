<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('zoom_meeting_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('zoom_meeting_id')->constrained();
            $table->string('event');
            $table->json('details');
            $table->timestamps();
            $table->softDeletes();
        });
    }


    public function down(): void
    {
        Schema::dropIfExists('zoom_meeting_events');
    }
};
