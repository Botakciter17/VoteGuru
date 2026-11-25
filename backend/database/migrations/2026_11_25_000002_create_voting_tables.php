<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('photo')->nullable();
            $table->string('subject');
            $table->text('bio')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('icon')->default('award');
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->softDeletes();
            $table->timestamps();
        });

        Schema::create('category_teacher', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['category_id', 'teacher_id']);
        });

        Schema::create('votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->string('voter_token', 100);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            // Indeks unik utama pencegah vote ganda sesuai PRD Bab 6 & 10
            $table->unique(['category_id', 'voter_token'], 'votes_category_voter_unique');
            $table->index('category_id');
            $table->index('teacher_id');
            $table->index(['category_id', 'ip_address']);
            $table->index('created_at');
        });

        Schema::create('vote_archives', function (Blueprint $table) {
            $table->id();
            $table->string('period_label');
            $table->unsignedBigInteger('category_id');
            $table->string('category_name');
            $table->unsignedBigInteger('teacher_id');
            $table->string('teacher_name');
            $table->string('voter_token', 100);
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('voted_at')->nullable();
            $table->timestamp('archived_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vote_archives');
        Schema::dropIfExists('votes');
        Schema::dropIfExists('category_teacher');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('teachers');
    }
};
