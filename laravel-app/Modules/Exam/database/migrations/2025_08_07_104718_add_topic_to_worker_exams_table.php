<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Exam\Models\WorkerExam;

return new class extends Migration
{

    public function up(): void
    {
        Schema::table('worker_exams', static function (Blueprint $table) {
            $table->foreignId('topic_id')
                ->after('user_id')
                ->nullable()
                ->constrained('topics')
                ->cascadeOnDelete();
        });

        foreach (WorkerExam::with('exam')->get() as $item) {
            if ($item->exam) {
                $item->topic_id = $item->exam->topic_id;
                $item->save();
            }
        }
    }

    public function down(): void
    {
        Schema::table('worker_exams', static function (Blueprint $table) {
            $table->dropConstrainedForeignId('topic_id');
        });
    }
};
